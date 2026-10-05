<template>
  <v-row dense class="manual-layout" :ref="setMotionRoot">
    <v-col cols="12">
      <v-card rounded="xl" class="enterprise-surface manual-hero">
        <div class="manual-hero__content">
          <div class="manual-hero__copy">
            <div class="manual-hero__eyebrow">
              <span class="manual-hero__pulse" />
              Centro de ayuda operativo
            </div>
            <h1 class="manual-hero__title">Guía de trabajo paso a paso</h1>
            <p class="manual-hero__description">
              Descubre quién hace cada paso, qué necesitas para avanzar y cómo se conectan los módulos de tu trabajo.
            </p>
            <div class="manual-hero__meta">
              <span><v-icon icon="mdi-account-check-outline" size="16" />Contenido según tus módulos disponibles</span>
              <span><v-icon icon="mdi-shield-check-outline" size="16" />Explicado sin términos técnicos</span>
            </div>
          </div>

          <div class="manual-hero__actions">
            <v-btn
              color="primary"
              prepend-icon="mdi-file-pdf-box"
              :loading="exportingPdf"
              :disabled="!accessibleManuals.length"
              @click="downloadManualPdf"
            >
              Previsualizar PDF
            </v-btn>
            <v-btn
              color="success"
              variant="tonal"
              prepend-icon="mdi-file-excel"
              :loading="exportingExcel"
              :disabled="!accessibleManuals.length"
              @click="downloadManualExcel"
            >
              Previsualizar Excel
            </v-btn>
          </div>
        </div>

        <div class="manual-summary-grid">
          <div class="manual-summary-card manual-summary-card--primary">
            <div class="manual-summary-card__icon"><v-icon icon="mdi-book-open-page-variant-outline" size="21" /></div>
            <div><strong>{{ filteredManuals.length }}</strong><span>Módulos disponibles</span></div>
          </div>
          <div class="manual-summary-card manual-summary-card--info">
            <div class="manual-summary-card__icon"><v-icon icon="mdi-shape-outline" size="21" /></div>
            <div><strong>{{ categoryOptions.length - 1 }}</strong><span>Áreas de trabajo</span></div>
          </div>
          <div class="manual-summary-card manual-summary-card--success">
            <div class="manual-summary-card__icon"><v-icon icon="mdi-check-decagram-outline" size="21" /></div>
            <div><strong>{{ completedChecklistCount }}</strong><span>Guías completadas</span></div>
          </div>
        </div>

        <div class="manual-filter-panel">
          <div class="manual-filter-panel__search">
            <v-text-field
              v-model="search"
              label="¿Qué proceso necesitas consultar?"
              variant="outlined"
              density="comfortable"
              prepend-inner-icon="mdi-magnify"
              clearable
              hide-details
            />
          </div>
          <div class="manual-filter-panel__categories">
            <v-chip
              v-for="category in categoryOptions"
              :key="category"
              :color="selectedCategory === category ? 'primary' : undefined"
              :variant="selectedCategory === category ? 'flat' : 'tonal'"
              label
              class="cursor-pointer"
              @click="selectedCategory = category"
            >
              {{ category }}
            </v-chip>
          </div>
        </div>
      </v-card>
    </v-col>

    <v-col v-if="!filteredManuals.length" cols="12">
      <v-alert type="warning" variant="tonal">
        No hay modulos operativos visibles para este usuario o el filtro actual no encontro coincidencias.
      </v-alert>
    </v-col>

    <template v-else>
      <v-col cols="12" md="4" lg="3">
        <v-card rounded="xl" class="enterprise-surface manual-nav-card">
          <div class="manual-nav-card__header">
            <div>
              <strong>Rutas disponibles</strong>
              <span>Selecciona el proceso que deseas aprender.</span>
            </div>
            <v-icon icon="mdi-map-marker-path" color="primary" />
          </div>
          <v-list density="comfortable" nav>
            <v-list-item
              v-for="manual in filteredManuals"
              :key="manual.routeName"
              rounded="xl"
              :active="manual.routeName === activeManualId"
              @click="activeManualId = manual.routeName"
            >
              <template #prepend>
                <v-avatar size="34" rounded="lg" class="manual-nav-avatar">
                  <span>{{ moduleInitials(manual.title) }}</span>
                </v-avatar>
              </template>
              <v-list-item-title class="font-weight-medium">
                {{ manual.title }}
              </v-list-item-title>
              <v-list-item-subtitle>
                {{ manual.category }} · {{ manual.flow.length }} pasos · {{ manual.commonErrors.length }} soluciones
              </v-list-item-subtitle>
              <template #append>
                <div class="manual-nav-progress">
                  <span>{{ checklistProgress(manual) }}/{{ manual.checklist.length }}</span>
                  <v-progress-linear
                    :model-value="checklistPercent(manual)"
                    color="success"
                    height="4"
                    rounded
                  />
                </div>
              </template>
            </v-list-item>
          </v-list>
        </v-card>
      </v-col>

      <v-col cols="12" md="8" lg="9">
        <v-card v-if="activeManual" rounded="xl" class="enterprise-surface manual-detail-card">
          <div class="manual-detail__header">
            <div class="manual-detail__copy">
              <div class="manual-detail__eyebrow">Guía del proceso</div>
              <div class="d-flex align-center flex-wrap" style="gap: 10px;">
                <h2 class="manual-detail__title">{{ activeManual.title }}</h2>
                <v-chip color="primary" variant="tonal" label>
                  {{ activeManual.category }}
                </v-chip>
              </div>
              <div class="manual-detail__summary">
                {{ activeManual.summary }}
              </div>
            </div>

            <div class="d-flex flex-wrap justify-end" style="gap: 8px;">
              <v-btn
                color="primary"
                prepend-icon="mdi-open-in-new"
                @click="goToModule(activeManual.routeName)"
              >
                Abrir modulo
              </v-btn>
              <v-btn
                variant="text"
                prepend-icon="mdi-check-all"
                @click="markChecklist(activeManual, true)"
              >
                Completar checklist
              </v-btn>
              <v-btn
                variant="text"
                prepend-icon="mdi-restore"
                @click="markChecklist(activeManual, false)"
              >
                Reiniciar
              </v-btn>
            </div>
          </div>

          <div class="manual-purpose-card">
            <div class="manual-purpose-card__icon"><v-icon icon="mdi-bullseye-arrow" size="22" /></div>
            <div>
              <strong>¿Para qué sirve?</strong>
              <span>{{ activeManual.purpose }}</span>
            </div>
          </div>

          <div class="manual-team">
            <div class="manual-team__heading"><v-icon icon="mdi-account-group-outline" /> Perfiles que intervienen</div>
            <div class="manual-team__profiles">
              <v-chip v-for="profile in activeProfiles" :key="profile" color="primary" variant="tonal">{{ profile }}</v-chip>
            </div>
            <p>Las responsabilidades se coordinan entre estos perfiles. Tus acciones disponibles dependen de tus permisos y sucursales.</p>
          </div>

          <v-tabs v-model="detailTab" class="manual-tabs" color="primary" show-arrows aria-label="Contenido de la guía">
            <v-tab value="flow">Flujo paso a paso</v-tab>
            <v-tab value="details">Datos y controles</v-tab>
            <v-tab value="help">Ayuda y verificación</v-tab>
          </v-tabs>

          <div v-show="detailTab === 'flow'">
          <div class="manual-prerequisites">
            <div class="manual-section-heading">
              <div class="manual-section-heading__icon manual-section-heading__icon--warning"><v-icon icon="mdi-sign-caution" size="20" /></div>
              <div><strong>Antes de empezar</strong><span>Estos pasos previos evitan bloqueos durante el proceso.</span></div>
            </div>
            <div class="manual-prerequisites__grid">
              <div
                v-for="item in activeManual.prerequisites"
                :key="item"
                class="manual-prerequisite"
              >
                <v-icon icon="mdi-check-circle-outline" size="18" />
                <span>{{ item }}</span>
              </div>
            </div>
          </div>

          <div class="manual-process-section">
            <div class="manual-section-heading">
              <div class="manual-section-heading__icon"><v-icon icon="mdi-directions-fork" size="20" /></div>
              <div><strong>Tu recorrido de trabajo</strong><span>Selecciona un paso para ver quién interviene y cómo continuar.</span></div>
            </div>
            <div class="manual-journey">
              <v-select class="manual-journey__mobile-select" v-model="activeStepIndex" :items="stepOptions" label="Selecciona un paso" variant="outlined" hide-details />
              <nav class="manual-journey__steps" aria-label="Pasos del flujo">
              <button
                v-for="(step, index) in activeManual.flow"
                :key="step.id"
                type="button"
                class="manual-journey__stop"
                :class="{ 'manual-journey__stop--active': activeStepIndex === index }"
                :aria-current="activeStepIndex === index ? 'step' : undefined"
                @click="activeStepIndex = index"
              >
                <span class="manual-journey__number">{{ index + 1 }}</span>
                <span><strong>{{ step.title }}</strong><small>{{ step.profiles?.join(' · ') }}</small></span>
                <v-icon icon="mdi-chevron-right" size="18" aria-hidden="true" />
              </button>
              </nav>
              <article v-if="activeStep" class="manual-step-detail" aria-live="polite" aria-atomic="true">
                <div class="manual-step-detail__progress">
                  <span>Paso {{ activeStepIndex + 1 }} de {{ activeManual.flow.length }}</span>
                  <v-progress-linear :model-value="((activeStepIndex + 1) / activeManual.flow.length) * 100" rounded height="4" color="primary" aria-label="Posición en el flujo" />
                </div>
                <h3>{{ activeStep.title }}</h3>
                <div class="manual-step-detail__actors">
                  <v-chip v-for="profile in activeStep.profiles" :key="profile" size="small" color="primary" variant="tonal" prepend-icon="mdi-account-outline">{{ profile }}</v-chip>
                </div>
                <div class="manual-step-detail__module">
                  <v-icon icon="mdi-view-grid-outline" size="18" />
                  <span>En <strong>{{ activeStep.moduleLabel }}</strong></span>
                  <v-btn v-if="canConsultStep(activeStep.moduleRoute)" size="small" variant="text" color="primary" @click="openStepModule(activeStep.moduleRoute)">Ver módulo <v-icon icon="mdi-arrow-top-right" end /></v-btn>
                </div>
                <div class="manual-step-detail__gate">
                  <strong><v-icon icon="mdi-lock-open-check-outline" size="18" /> Para empezar este paso</strong>
                  <p>{{ activeStep.requirement }}</p>
                </div>
                <div class="manual-step-detail__action"><strong>Qué debes hacer</strong><p>{{ activeStep.description }}</p></div>
                <ul v-if="activeStep.checks.length" class="manual-list">
                    <li v-for="check in activeStep.checks" :key="check">{{ check }}</li>
                  </ul>
                <div class="manual-step-detail__result">
                  <strong><v-icon icon="mdi-check-circle-outline" size="18" /> Resultado para continuar</strong>
                  <p>{{ activeStep.outcome }}</p>
                </div>
                <div class="manual-step-detail__navigation">
                  <v-btn variant="text" :disabled="activeStepIndex === 0" prepend-icon="mdi-arrow-left" @click="activeStepIndex--">Anterior</v-btn>
                  <v-btn color="primary" variant="flat" :disabled="activeStepIndex === activeManual.flow.length - 1" append-icon="mdi-arrow-right" @click="activeStepIndex++">Siguiente</v-btn>
                </div>
                <p class="manual-step-detail__hint">Este recorrido es una guía de lectura; cambiar de paso no modifica la operación.</p>
              </article>
            </div>
          </div>

          <div v-if="nextStep" class="manual-next-person">
            <v-icon icon="mdi-account-switch-outline" color="primary" />
            <span><strong>Después interviene: {{ nextStep.profiles?.join(' / ') }}</strong><br>{{ nextStep.title }} · {{ nextStep.moduleLabel }}</span>
          </div>
          </div>

          <div v-show="detailTab === 'details'">

          <section class="manual-state-section" aria-labelledby="manual-state-title">
            <div class="manual-section-heading">
              <div class="manual-section-heading__icon manual-section-heading__icon--info">
                <v-icon icon="mdi-progress-check" size="20" aria-hidden="true" />
              </div>
              <div>
                <strong id="manual-state-title">Etapas y controles del flujo</strong>
                <span>Antes de avanzar, confirma qué significa la etapa y qué debe quedar listo.</span>
              </div>
            </div>
            <div class="manual-state-grid">
              <article
                v-for="(state, index) in activeManual.states"
                :key="`${activeManual.routeName}-state-${index}`"
                class="manual-state-card"
              >
                <div class="manual-state-card__number">{{ index + 1 }}</div>
                <div class="manual-state-card__body">
                  <h3>{{ state.name }}</h3>
                  <p>{{ state.meaning }}</p>
                  <dl>
                    <div>
                      <dt>Qué debe hacer la persona usuaria</dt>
                      <dd>{{ state.userAction }}</dd>
                    </div>
                    <div>
                      <dt>Cómo confirmar que puede avanzar</dt>
                      <dd>{{ state.validation }}</dd>
                    </div>
                  </dl>
                </div>
              </article>
            </div>
          </section>

          <section
            v-if="activeManual.handoffs.length"
            class="manual-handoff-section"
            aria-labelledby="manual-handoff-title"
          >
            <div class="manual-section-heading">
              <div class="manual-section-heading__icon manual-section-heading__icon--warning">
                <v-icon icon="mdi-account-switch-outline" size="20" aria-hidden="true" />
              </div>
              <div>
                <strong id="manual-handoff-title">Quién interviene después</strong>
                <span>Estos relevos requieren que otro perfil complete su parte antes de continuar.</span>
              </div>
            </div>
            <div class="manual-handoff-list">
              <article
                v-for="(handoff, index) in activeManual.handoffs"
                :key="`${activeManual.routeName}-handoff-${index}`"
                class="manual-handoff-card"
              >
                <div class="manual-handoff-card__moment">{{ handoff.moment }}</div>
                <div class="manual-handoff-card__route">
                  <span>{{ handoff.delivers }}</span>
                  <v-icon icon="mdi-arrow-right" size="18" aria-hidden="true" />
                  <span>{{ handoff.receives }}</span>
                </div>
                <p>{{ handoff.action }}</p>
                <div class="manual-handoff-card__ready">
                  <v-icon icon="mdi-check-circle-outline" size="18" aria-hidden="true" />
                  <span><strong>Listo para avanzar cuando</strong> {{ handoff.readyWhen }}</span>
                </div>
              </article>
            </div>
          </section>

          <v-row dense class="mt-4">
            <v-col cols="12" lg="7">
              <v-card rounded="xl" class="pa-4 manual-section-card">
                <div class="manual-section-heading manual-section-heading--compact">
                  <div class="manual-section-heading__icon"><v-icon icon="mdi-form-select" size="20" /></div>
                  <div><strong>Información que debes completar</strong><span>Empieza por los datos marcados como obligatorios.</span></div>
                </div>
                <div class="manual-fields">
                  <div
                    v-for="field in sortedFields(activeManual)"
                    :key="`${activeManual.routeName}-${field.key}`"
                    class="manual-field"
                  >
                    <div class="d-flex align-center justify-space-between" style="gap: 8px;">
                      <div class="font-weight-medium">{{ field.label }}</div>
                      <div class="d-flex flex-wrap justify-end" style="gap: 6px;">
                        <v-chip
                          size="x-small"
                          :color="field.required ? 'error' : 'secondary'"
                          variant="tonal"
                          label
                        >
                          {{ field.required ? "Obligatorio" : "Opcional" }}
                        </v-chip>
                      </div>
                    </div>
                    <div class="text-body-2 text-medium-emphasis mt-2">
                      {{ field.note }}
                    </div>
                    <div v-if="field.example" class="manual-field__example">
                      <strong>Ejemplo</strong>
                      <span>{{ field.example }}</span>
                    </div>
                  </div>
                </div>
              </v-card>
            </v-col>

            <v-col cols="12" lg="5">
              <v-card rounded="xl" class="pa-4 manual-section-card mb-3">
                <div class="manual-section-heading manual-section-heading--compact">
                  <div class="manual-section-heading__icon manual-section-heading__icon--success"><v-icon icon="mdi-lightbulb-on-outline" size="20" /></div>
                  <div><strong>Recomendaciones útiles</strong><span>Pequeñas verificaciones que previenen reprocesos.</span></div>
                </div>
                <ul class="manual-list">
                  <li v-for="tip in activeManual.tips" :key="tip">{{ tip }}</li>
                </ul>
              </v-card>

              <v-card rounded="xl" class="pa-4 manual-section-card">
                <div class="manual-section-heading manual-section-heading--compact">
                  <div class="manual-section-heading__icon manual-section-heading__icon--warning"><v-icon icon="mdi-alert-outline" size="20" /></div>
                  <div><strong>Cuidados importantes</strong><span>Revísalos antes de confirmar una operación.</span></div>
                </div>
                <ul class="manual-list">
                  <li v-for="warning in activeManual.warnings" :key="warning">{{ warning }}</li>
                </ul>
              </v-card>
            </v-col>
          </v-row>

          </div>
          <div v-show="detailTab === 'help'">
          <div class="manual-errors-section">
            <div class="manual-section-heading">
              <div class="manual-section-heading__icon manual-section-heading__icon--error"><v-icon icon="mdi-alert-decagram-outline" size="20" /></div>
              <div>
                <strong>Si el proceso no te deja continuar</strong>
                <span>Busca el caso que se parece a tu problema y completa primero el paso que falta.</span>
              </div>
              <v-chip color="error" variant="tonal" label>{{ activeManual.commonErrors.length }} casos frecuentes</v-chip>
            </div>

            <div class="manual-errors-grid">
              <article
                v-for="(issue, index) in activeManual.commonErrors"
                :key="`${activeManual.routeName}-issue-${index}`"
                class="manual-error-card"
              >
                <div class="manual-error-card__header">
                  <span>{{ index + 1 }}</span>
                  <strong>{{ issue.title }}</strong>
                </div>
                <div class="manual-error-card__row">
                  <b>Qué ocurre</b>
                  <span>{{ issue.whatHappens }}</span>
                </div>
                <div class="manual-error-card__row">
                  <b>Por qué ocurre</b>
                  <span>{{ issue.why }}</span>
                </div>
                <div class="manual-error-card__solution">
                  <v-icon icon="mdi-check-circle-outline" size="18" />
                  <div><b>Cómo resolverlo</b><span>{{ issue.howToResolve }}</span></div>
                </div>
              </article>
            </div>
          </div>

          <v-row dense class="mt-2">
            <v-col cols="12" lg="7">
              <v-card rounded="xl" class="pa-4 manual-section-card">
                <div class="d-flex align-center justify-space-between flex-wrap" style="gap: 8px;">
                  <div class="manual-section-heading manual-section-heading--compact mb-0">
                    <div class="manual-section-heading__icon manual-section-heading__icon--success"><v-icon icon="mdi-clipboard-check-outline" size="20" /></div>
                    <div><strong>Verificación final</strong><span>Marca cada punto antes de cerrar el proceso.</span></div>
                  </div>
                  <v-chip color="success" variant="tonal" label>
                    {{ checklistProgress(activeManual) }}/{{ activeManual.checklist.length }} completado
                  </v-chip>
                </div>

                <div class="mt-3">
                  <v-checkbox
                    v-for="(item, index) in activeManual.checklist"
                    :key="checklistKey(activeManual, index)"
                    :model-value="isChecklistChecked(activeManual, index)"
                    color="primary"
                    hide-details
                    @update:model-value="updateChecklist(activeManual, index, Boolean($event))"
                  >
                    <template #label>
                      <span>{{ item }}</span>
                    </template>
                  </v-checkbox>
                </div>
              </v-card>
            </v-col>

            <v-col cols="12" lg="5">
              <v-card rounded="xl" class="pa-4 manual-section-card">
                <div class="manual-section-heading manual-section-heading--compact">
                  <div class="manual-section-heading__icon"><v-icon icon="mdi-link-variant" size="20" /></div>
                  <div><strong>Procesos relacionados</strong><span>Ábrelos cuando necesites completar un paso previo.</span></div>
                </div>
                <div v-if="resolvedRelatedManuals(activeManual).length" class="d-flex flex-wrap" style="gap: 8px;">
                  <v-chip
                    v-for="related in resolvedRelatedManuals(activeManual)"
                    :key="related.routeName"
                    color="secondary"
                    variant="tonal"
                    label
                    class="cursor-pointer"
                    @click="focusManual(related.routeName)"
                  >
                    {{ related.title }}
                  </v-chip>
                </div>
                <div v-else class="text-body-2 text-medium-emphasis">
                  Este proceso no tiene relaciones directas visibles para tu usuario.
                </div>
              </v-card>
            </v-col>
          </v-row>
          </div>
        </v-card>
      </v-col>
    </template>
  </v-row>

  <ReportPreviewDialogs :preview="reportPreview" />
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { resolveMotionElement, useRevealMotion } from "@/app/motion";
import { useRouter } from "vue-router";
import { useAuthStore } from "@/app/stores/auth.store";
import { useMenuStore } from "@/app/stores/menu.store";
import { useUiStore } from "@/app/stores/ui.store";
import {
  getOperativeUserManualDefinition,
  type UserManualDefinition,
  type UserManualFieldGuide,
} from "@/app/config/user-manual";
import type { MenuNode } from "@/app/types/menu.types";
import { findMenuRouteByValue } from "@/app/utils/menu-route-catalog";
import { useReportPreview } from "@/app/utils/report-preview";
import ReportPreviewDialogs from "@/components/ui/ReportPreviewDialogs.vue";
import {
  buildUserManualExcelReport,
  buildUserManualPdfBlob,
  userManualFileName,
  userManualProfileLabel,
} from "@/app/utils/user-manual-documents";

const router = useRouter();
const auth = useAuthStore();
const menu = useMenuStore();
const ui = useUiStore();
const reportPreview = useReportPreview({
  title: "Previsualización del manual de usuario",
});

const search = ref("");
const selectedCategory = ref("Todas");
const activeManualId = ref("");
const activeStepIndex = ref(0);
const detailTab = ref("flow");
const checklistState = ref<Record<string, boolean>>({});
const exportingPdf = ref(false);
const exportingExcel = ref(false);

function flattenMenu(nodes: MenuNode[]): MenuNode[] {
  return (nodes ?? []).flatMap((node) => [node, ...flattenMenu(node.children ?? [])]);
}

const manualStorageKey = computed(
  () => `user-manual:flows-v2:${auth.userId || auth.user?.id || auth.user?.nameUser || "anon"}`,
);

function loadChecklistState() {
  if (typeof window === "undefined") return;
  try {
    const raw = window.localStorage.getItem(manualStorageKey.value);
    checklistState.value = raw ? JSON.parse(raw) : {};
  } catch {
    checklistState.value = {};
  }
}

function persistChecklistState() {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(manualStorageKey.value, JSON.stringify(checklistState.value));
}

const accessibleManuals = computed(() => {
  const manualMap = new Map<string, UserManualDefinition>();

  for (const node of flattenMenu(menu.tree)) {
    const routeItem = findMenuRouteByValue(router, node.urlComponent || "");
    if (!routeItem || !node.permissions?.isReaded) continue;
    const routeName = routeItem?.routeName ?? String(node.urlComponent || "").trim();
    const manual = getOperativeUserManualDefinition(
      routeName,
      routeItem?.title || node.nombre,
    );
    if (!manual || manualMap.has(manual.routeName)) continue;
    manualMap.set(manual.routeName, manual);
  }

  return Array.from(manualMap.values()).sort((left, right) =>
    left.title.localeCompare(right.title, "es"),
  );
});

const categoryOptions = computed(() => [
  "Todas",
  ...Array.from(new Set(accessibleManuals.value.map((item) => item.category))).sort((a, b) =>
    a.localeCompare(b, "es"),
  ),
]);

const filteredManuals = computed(() => {
  const normalizeSearch = (value: unknown) => String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
  const normalizedSearch = normalizeSearch(search.value);

  return accessibleManuals.value.filter((manual) => {
    const matchesCategory =
      selectedCategory.value === "Todas" || manual.category === selectedCategory.value;

    if (!matchesCategory) return false;
    if (!normalizedSearch) return true;

    const haystack = [
      manual.title,
      manual.category,
      manual.summary,
      manual.purpose,
      ...manual.prerequisites,
      ...manual.tips,
      ...manual.warnings,
      ...manual.commonErrors.flatMap((issue) => [
        issue.title,
        issue.whatHappens,
        issue.why,
        issue.howToResolve,
      ]),
      ...manual.checklist,
      ...manual.flow.flatMap((item) => [item.title, item.description, item.requirement, item.outcome, item.moduleLabel, ...(item.profiles ?? []), ...item.fields, ...item.checks]),
      ...manual.states.flatMap((state) => [state.name, state.meaning, state.userAction, state.validation]),
      ...manual.handoffs.flatMap((handoff) => [
        handoff.moment,
        handoff.delivers,
        handoff.receives,
        handoff.action,
        handoff.readyWhen,
      ]),
      ...manual.fields.flatMap((field) => [field.label, field.note, field.example || ""]),
    ]
      .join(" ")
      .toLowerCase();

    return normalizeSearch(haystack).includes(normalizedSearch);
  });
});

const activeManual = computed(
  () =>
    filteredManuals.value.find((manual) => manual.routeName === activeManualId.value) ??
    filteredManuals.value[0] ??
    null,
);

const activeStep = computed(() => activeManual.value?.flow[activeStepIndex.value]);
const stepOptions = computed(() => activeManual.value?.flow.map((step, index) => ({ title: `Paso ${index + 1}: ${step.title}`, value: index })) ?? []);
const nextStep = computed(() => activeManual.value?.flow[activeStepIndex.value + 1]);
const activeProfiles = computed(() => [...new Set(activeManual.value?.flow.flatMap(step => step.profiles ?? []) ?? [])]);

watch(() => activeManual.value?.routeName, () => {
  activeStepIndex.value = 0;
  detailTab.value = "flow";
});

function canConsultStep(routeName?: string) {
  return Boolean(routeName && accessibleManuals.value.some(manual => manual.routeName === routeName));
}

function openStepModule(routeName?: string) {
  if (routeName && canConsultStep(routeName)) router.push({ name: routeName });
}

const completedChecklistCount = computed(
  () => accessibleManuals.value.filter((manual) => checklistProgress(manual) === manual.checklist.length).length,
);

function checklistKey(manual: UserManualDefinition, index: number) {
  return `${manual.routeName}:check:${index}`;
}

function isChecklistChecked(manual: UserManualDefinition, index: number) {
  return Boolean(checklistState.value[checklistKey(manual, index)]);
}

function updateChecklist(manual: UserManualDefinition, index: number, checked: boolean) {
  checklistState.value = {
    ...checklistState.value,
    [checklistKey(manual, index)]: checked,
  };
  persistChecklistState();
}

function checklistProgress(manual: UserManualDefinition) {
  return manual.checklist.filter((_, index) => isChecklistChecked(manual, index)).length;
}

function checklistPercent(manual: UserManualDefinition) {
  if (!manual.checklist.length) return 0;
  return (checklistProgress(manual) / manual.checklist.length) * 100;
}

function markChecklist(manual: UserManualDefinition, checked: boolean) {
  const nextState = { ...checklistState.value };
  for (let index = 0; index < manual.checklist.length; index += 1) {
    nextState[checklistKey(manual, index)] = checked;
  }
  checklistState.value = nextState;
  persistChecklistState();
}

function moduleInitials(title: string) {
  return title
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

function sortedFields(manual: UserManualDefinition): UserManualFieldGuide[] {
  return [...manual.fields].sort((left, right) => Number(right.required) - Number(left.required));
}

function manualDocumentContext() {
  return {
    manuals: accessibleManuals.value,
    userLabel: String(auth.user?.nameSurname || auth.user?.nameUser || "Usuario"),
    roleLabel: userManualProfileLabel(auth.user?.role?.nombre),
    generatedAt: new Date(),
    isChecklistChecked,
  };
}

async function downloadManualExcel() {
  const context = manualDocumentContext();
  if (!context.manuals.length) {
    ui.error("No hay módulos disponibles para generar el manual.");
    return;
  }
  exportingExcel.value = true;
  try {
    await reportPreview.open("excel", buildUserManualExcelReport(context));
  } catch (error: any) {
    ui.error(error?.message || "No se pudo generar el manual en Excel.");
  } finally {
    exportingExcel.value = false;
  }
}

async function downloadManualPdf() {
  const context = manualDocumentContext();
  if (!context.manuals.length) {
    ui.error("No hay módulos disponibles para generar el manual.");
    return;
  }
  exportingPdf.value = true;
  try {
    await reportPreview.pdf.open({
      title: "Manual de usuario",
      subtitle: context.roleLabel || "",
      fileName: userManualFileName(context.roleLabel, context.generatedAt),
      build: () => buildUserManualPdfBlob(context),
    });
  } catch (error: any) {
    ui.error(error?.message || "No se pudo generar el manual en PDF.");
  } finally {
    exportingPdf.value = false;
  }
}

function focusManual(routeName: string) {
  const exists = filteredManuals.value.some((item) => item.routeName === routeName);
  if (exists) {
    activeManualId.value = routeName;
    return;
  }
  void goToModule(routeName);
}

function resolvedRelatedManuals(manual: UserManualDefinition) {
  const allowed = new Map(accessibleManuals.value.map((item) => [item.routeName, item]));
  return manual.relatedRoutes
    .map((routeName) => allowed.get(routeName) ?? null)
    .filter((item): item is UserManualDefinition => Boolean(item));
}

async function goToModule(routeName: string) {
  await router.push({ name: routeName });
}

watch(
  filteredManuals,
  (manuals) => {
    if (!manuals.length) {
      activeManualId.value = "";
      return;
    }
    if (!manuals.some((manual) => manual.routeName === activeManualId.value)) {
      const firstManual = manuals[0];
      activeManualId.value = firstManual ? firstManual.routeName : "";
    }
  },
  { immediate: true },
);

watch(manualStorageKey, loadChecklistState, { immediate: true });
/**
 * Motor de movimiento del design system, solo para el hover de tarjetas
 * (`js-hover-card`).
 *
 * Se declara al final del `<script setup>` y sin clave de reenganche a
 * proposito: `useRevealMotion` evalua su getter al instante, y una clave que
 * lea un computed puede alcanzar variables aun en zona muerta. Sin clave no hay
 * watch, asi que no hay TDZ posible.
 *
 * Al no usar clases de revelado, el peor caso si el motor no engancha es
 * quedarse sin animacion de hover, nunca con contenido invisible.
 */
const motionRoot = useRevealMotion<HTMLElement>();

function setMotionRoot(el: unknown) {
  motionRoot.value = resolveMotionElement(el);
}
</script>

<style scoped>
.manual-team { margin: 20px 0; padding: 18px; border-radius: 16px; background: rgba(var(--v-theme-primary), .045); border: 1px solid rgba(var(--v-theme-primary), .12); }
.manual-team__heading { display: flex; gap: 8px; align-items: center; font-weight: 700; }
.manual-team__profiles, .manual-step-detail__actors { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
.manual-team p { font-size: 12px; margin-top: 12px; color: rgba(var(--v-theme-on-surface), .7); }
.manual-tabs { margin-bottom: 20px; border-bottom: 1px solid rgba(var(--v-theme-on-surface), .12); }
.manual-journey { display: grid; grid-template-columns: minmax(0, .85fr) minmax(0, 1.5fr); gap: 20px; align-items: start; }
.manual-journey__steps { display: grid; gap: 8px; }
.manual-journey__mobile-select { display: none; }
.manual-journey__stop { display: grid; grid-template-columns: 30px minmax(0, 1fr) 18px; align-items: center; gap: 10px; width: 100%; min-height: 66px; padding: 12px; text-align: left; border: 1px solid rgba(var(--v-theme-on-surface), .1); border-radius: 12px; background: rgb(var(--v-theme-surface)); color: rgb(var(--v-theme-on-surface)); cursor: pointer; }
.manual-journey__stop:hover { border-color: rgba(var(--v-theme-primary), .5); }
.manual-journey__stop:focus-visible { outline: 3px solid rgba(var(--v-theme-primary), .6); outline-offset: 2px; }
.manual-journey__stop--active { background: rgba(var(--v-theme-primary), .065); border-color: rgb(var(--v-theme-primary)); }
.manual-journey__stop strong { display: block; font-size: 13px; line-height: 1.4; }
.manual-journey__stop small { display: block; font-size: 11px; line-height: 1.5; color: rgba(var(--v-theme-on-surface), .7); margin-top: 4px; }
.manual-journey__number { display: grid; place-items: center; width: 30px; height: 30px; border-radius: 50%; color: rgb(var(--v-theme-primary)); background: rgba(var(--v-theme-primary), .09); font-weight: 700; }
.manual-journey__stop--active .manual-journey__number { background: rgb(var(--v-theme-primary)); color: rgb(var(--v-theme-on-primary)); }
.manual-step-detail { min-width: 0; padding: 24px; border: 1px solid rgba(var(--v-theme-primary), .2); border-radius: 18px; background: rgb(var(--v-theme-surface)); box-shadow: 0 8px 28px rgba(var(--v-theme-primary), .05); }
.manual-step-detail__progress { display: grid; gap: 8px; color: rgb(var(--v-theme-primary)); font-size: 12px; font-weight: 700; margin-bottom: 20px; }
.manual-step-detail h3 { font-size: 21px; line-height: 1.3; }
.manual-step-detail__module { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; font-size: 13px; margin: 16px 0; }
.manual-step-detail__gate, .manual-step-detail__result { padding: 14px; border-radius: 12px; margin: 18px 0; }
.manual-step-detail__gate { background: rgba(var(--v-theme-warning), .09); border: 1px solid rgba(var(--v-theme-warning), .2); }
.manual-step-detail__result { background: rgba(var(--v-theme-success), .07); border: 1px solid rgba(var(--v-theme-success), .16); }
.manual-step-detail strong { font-size: 13px; }
.manual-step-detail p { margin: 8px 0 0; font-size: 14px; line-height: 1.7; overflow-wrap: anywhere; }
.manual-step-detail__navigation { display: flex; justify-content: space-between; gap: 8px; margin-top: 24px; }
.manual-step-detail .manual-step-detail__hint { font-size: 11px; color: rgba(var(--v-theme-on-surface), .6); }
.manual-next-person { display: flex; gap: 12px; align-items: center; padding: 16px; margin-top: 16px; border-radius: 12px; border: 1px dashed rgba(var(--v-theme-primary), .25); font-size: 13px; line-height: 1.7; }
@media (max-width: 1100px) { .manual-journey { grid-template-columns: minmax(0, 1fr); } }
@media (max-width: 600px) { .manual-journey__steps { display: none; } .manual-journey__mobile-select { display: block; } .manual-step-detail { padding: 16px; } .manual-step-detail h3 { font-size: 19px; } .manual-team { padding: 14px; } }
.manual-layout {
  --manual-primary: 37, 99, 235;
  --manual-info: 8, 145, 178;
  --manual-success: 22, 163, 74;
  --manual-warning: 217, 119, 6;
  --manual-error: 220, 38, 38;
  align-items: flex-start;
}

.manual-hero {
  position: relative;
  isolation: isolate;
  overflow: hidden;
  padding: clamp(22px, 3vw, 34px);
  border: 1px solid rgba(var(--manual-primary), 0.18);
  /* Estilo Swiss: superficie plana y una regla de acento como unico elemento
   * grafico. El degradado se retiro por el anti-patron de ornamento del
   * MASTER.md. */
  border-top: 3px solid rgb(var(--v-theme-primary));
  background: var(--surface-base);
  box-shadow: 0 18px 48px rgba(15, 23, 42, 0.08);
}




.manual-hero__content {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}

.manual-hero__copy {
  max-width: 760px;
}

.manual-hero__eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: rgb(var(--v-theme-primary));
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.manual-hero__pulse {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: rgb(var(--v-theme-primary));
  box-shadow: 0 0 0 0 rgba(var(--manual-primary), 0.36);
  animation: manual-pulse 2.2s infinite;
}

.manual-hero__title {
  margin: 9px 0 6px;
  font-size: clamp(1.7rem, 3vw, 2.35rem);
  font-weight: 850;
  letter-spacing: -0.04em;
  line-height: 1.08;
}

.manual-hero__description {
  max-width: 700px;
  margin: 0;
  color: rgba(var(--v-theme-on-surface), 0.68);
  font-size: 0.96rem;
  line-height: 1.6;
}

.manual-hero__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 10px 18px;
  margin-top: 17px;
  color: rgba(var(--v-theme-on-surface), 0.62);
  font-size: 0.78rem;
  font-weight: 600;
}

.manual-hero__meta span {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.manual-hero__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: flex-end;
}

.manual-summary-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(180px, 1fr));
  gap: 10px;
  margin-top: 27px;
}

.manual-summary-card {
  --summary-tone: var(--manual-primary);
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 76px;
  padding: 14px 16px;
  border: 1px solid rgba(var(--summary-tone), 0.17);
  border-radius: 16px;
  background: rgba(var(--v-theme-surface), 0.72);
  backdrop-filter: blur(10px);
}

.manual-summary-card--info { --summary-tone: var(--manual-info); }
.manual-summary-card--success { --summary-tone: var(--manual-success); }

.manual-summary-card__icon {
  display: grid;
  flex: 0 0 auto;
  width: 42px;
  height: 42px;
  place-items: center;
  border-radius: 13px;
  color: rgba(var(--summary-tone), 0.96);
  background: rgba(var(--summary-tone), 0.12);
}

.manual-summary-card strong,
.manual-summary-card span {
  display: block;
}

.manual-summary-card strong {
  font-size: 1.2rem;
  font-weight: 850;
  line-height: 1;
}

.manual-summary-card span {
  margin-top: 5px;
  color: rgba(var(--v-theme-on-surface), 0.58);
  font-size: 0.73rem;
  font-weight: 600;
}

.manual-filter-panel {
  display: grid;
  grid-template-columns: minmax(280px, 0.9fr) minmax(360px, 1.5fr);
  gap: 16px;
  align-items: center;
  margin-top: 13px;
  padding: 14px;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  border-radius: 18px;
  background: rgba(var(--v-theme-surface), 0.76);
}

.manual-filter-panel__categories {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
  justify-content: flex-end;
}

.manual-nav-card {
  position: sticky;
  top: 88px;
  overflow: hidden;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  box-shadow: 0 12px 34px rgba(15, 23, 42, 0.06);
}

.manual-nav-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 18px 16px 12px;
}

.manual-nav-card__header strong,
.manual-nav-card__header span {
  display: block;
}

.manual-nav-card__header strong {
  font-size: 0.9rem;
}

.manual-nav-card__header span {
  margin-top: 3px;
  color: rgba(var(--v-theme-on-surface), 0.56);
  font-size: 0.7rem;
}

.manual-nav-card :deep(.v-list) {
  padding: 6px 8px 12px;
  background: transparent;
}

.manual-nav-card :deep(.v-list-item) {
  min-height: 66px;
  margin-top: 5px;
  border: 1px solid transparent;
  transition: background-color 160ms ease, border-color 160ms ease, transform 160ms ease;
}

.manual-nav-card :deep(.v-list-item:hover) {
  transform: translateX(2px);
  border-color: rgba(var(--manual-primary), 0.12);
  background: rgba(var(--manual-primary), 0.055);
}

.manual-nav-card :deep(.v-list-item--active) {
  border-color: rgba(var(--manual-primary), 0.2);
  background: rgba(var(--manual-primary), 0.09);
}

.manual-nav-avatar {
  border: 1px solid rgba(var(--manual-primary), 0.18);
  color: rgb(var(--v-theme-primary));
  background: rgba(var(--manual-primary), 0.1);
  font-size: 0.72rem;
  font-weight: 800;
}

.manual-nav-progress {
  display: grid;
  width: 42px;
  gap: 5px;
  color: rgba(var(--v-theme-on-surface), 0.56);
  font-size: 0.65rem;
  font-weight: 700;
  text-align: right;
}

.manual-detail-card {
  overflow: hidden;
  padding: clamp(18px, 2.5vw, 28px);
  border: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  box-shadow: 0 15px 42px rgba(15, 23, 42, 0.07);
}

.manual-detail__header {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
  align-items: flex-start;
}

.manual-detail__copy {
  max-width: 760px;
}

.manual-detail__eyebrow,
.manual-flow__step-kicker {
  color: rgb(var(--v-theme-primary));
  font-size: 0.67rem;
  font-weight: 800;
  letter-spacing: 0.11em;
  text-transform: uppercase;
}

.manual-detail__title {
  margin: 4px 0 0;
  font-size: clamp(1.35rem, 2.4vw, 1.75rem);
  font-weight: 850;
  letter-spacing: -0.03em;
}

.manual-detail__summary {
  margin-top: 9px;
  color: rgba(var(--v-theme-on-surface), 0.64);
  font-size: 0.87rem;
  line-height: 1.55;
}

.manual-purpose-card {
  display: flex;
  align-items: flex-start;
  gap: 13px;
  margin-top: 22px;
  padding: 16px;
  border: 1px solid rgba(var(--manual-info), 0.16);
  border-radius: 16px;
  background: linear-gradient(115deg, rgba(var(--manual-info), 0.09), rgba(var(--manual-primary), 0.035));
}

.manual-purpose-card__icon {
  display: grid;
  flex: 0 0 auto;
  width: 40px;
  height: 40px;
  place-items: center;
  border-radius: 12px;
  color: rgb(var(--v-theme-primary));
  background: rgba(var(--manual-primary), 0.11);
}

.manual-purpose-card strong,
.manual-purpose-card span {
  display: block;
}

.manual-purpose-card strong {
  font-size: 0.82rem;
}

.manual-purpose-card span {
  margin-top: 4px;
  color: rgba(var(--v-theme-on-surface), 0.66);
  font-size: 0.81rem;
  line-height: 1.55;
}

.manual-prerequisites,
.manual-process-section,
.manual-errors-section {
  margin-top: 24px;
}

.manual-section-heading {
  display: flex;
  align-items: center;
  gap: 11px;
  margin-bottom: 14px;
}

.manual-section-heading > div:nth-child(2) {
  min-width: 0;
  flex: 1;
}

.manual-section-heading strong,
.manual-section-heading span {
  display: block;
}

.manual-section-heading strong {
  font-size: 0.9rem;
}

.manual-section-heading span {
  margin-top: 2px;
  color: rgba(var(--v-theme-on-surface), 0.56);
  font-size: 0.72rem;
}

.manual-section-heading--compact {
  align-items: flex-start;
  margin-bottom: 16px;
}

.manual-section-heading--compact.mb-0 {
  margin-bottom: 0;
}

.manual-section-heading__icon {
  display: grid;
  flex: 0 0 auto;
  width: 39px;
  height: 39px;
  place-items: center;
  border-radius: 12px;
  color: rgb(var(--v-theme-primary));
  background: rgba(var(--manual-primary), 0.11);
}

.manual-section-heading__icon--success {
  color: rgb(var(--manual-success));
  background: rgba(var(--manual-success), 0.11);
}

.manual-section-heading__icon--warning {
  color: rgb(var(--manual-warning));
  background: rgba(var(--manual-warning), 0.11);
}

.manual-section-heading__icon--error {
  color: rgb(var(--manual-error));
  background: rgba(var(--manual-error), 0.1);
}

.manual-section-heading__icon--info {
  color: rgb(var(--manual-info));
  background: rgba(var(--manual-info), 0.11);
}

.manual-prerequisites__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 9px;
}

.manual-prerequisite {
  display: flex;
  align-items: flex-start;
  gap: 9px;
  padding: 12px 13px;
  border: 1px solid rgba(var(--manual-warning), 0.15);
  border-radius: 13px;
  color: rgba(var(--v-theme-on-surface), 0.71);
  background: rgba(var(--manual-warning), 0.045);
  font-size: 0.78rem;
  line-height: 1.45;
}

.manual-prerequisite .v-icon {
  flex: 0 0 auto;
  margin-top: 1px;
  color: rgb(var(--manual-warning));
}

.manual-flow {
  display: grid;
  gap: 11px;
}

.manual-flow__step {
  position: relative;
  display: grid;
  grid-template-columns: 46px minmax(0, 1fr);
  gap: 13px;
}

.manual-flow__step-index {
  display: grid;
  width: 42px;
  height: 42px;
  place-items: center;
  border: 1px solid rgba(var(--manual-primary), 0.18);
  border-radius: 14px;
  background: rgba(var(--manual-primary), 0.1);
  color: rgb(var(--v-theme-primary));
  font-weight: 850;
}

.manual-flow__step-card,
.manual-section-card,
.manual-field {
  border: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  background: rgba(var(--v-theme-surface), 0.9);
}

.manual-flow__step-card {
  padding: 17px;
  border-radius: 17px;
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.04);
  transition: border-color 160ms ease, transform 160ms ease;
}

.manual-flow__step-card:hover {
  /* El desplazamiento lo gobierna el motor via js-hover-card. */
  border-color: rgba(var(--manual-primary), 0.22);
}

.manual-flow__step-kicker {
  margin-bottom: 3px;
  font-size: 0.6rem;
}

.manual-fields {
  display: grid;
  gap: 9px;
}

.manual-field {
  padding: 13px 14px;
  border-radius: 14px;
  transition: background-color 150ms ease, border-color 150ms ease;
}

.manual-field:hover {
  border-color: rgba(var(--manual-primary), 0.18);
  background: rgba(var(--manual-primary), 0.035);
}

.manual-field__example {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 8px;
  margin-top: 10px;
  padding: 9px 10px;
  border-radius: 10px;
  color: rgba(var(--v-theme-on-surface), 0.72);
  background: rgba(var(--manual-primary), 0.055);
  font-size: 0.78rem;
  line-height: 1.45;
}

.manual-field__example strong {
  color: rgb(var(--v-theme-primary));
}

.manual-state-section,
.manual-handoff-section {
  margin-top: 18px;
  padding: 18px;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  border-radius: 20px;
  background: rgba(var(--v-theme-surface), 0.82);
}

.manual-state-grid,
.manual-handoff-list {
  display: grid;
  gap: 11px;
}

.manual-state-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.manual-state-card {
  display: grid;
  grid-template-columns: 34px minmax(0, 1fr);
  gap: 11px;
  padding: 14px;
  border: 1px solid rgba(var(--manual-info), 0.16);
  border-radius: 15px;
  background: rgba(var(--manual-info), 0.035);
}

.manual-state-card__number {
  display: grid;
  width: 32px;
  height: 32px;
  place-items: center;
  border-radius: 10px;
  color: rgb(var(--manual-info));
  background: rgba(var(--manual-info), 0.12);
  font-weight: 800;
}

.manual-state-card h3 {
  margin: 0;
  color: rgba(var(--v-theme-on-surface), 0.92);
  font-size: 0.88rem;
}

.manual-state-card p,
.manual-handoff-card p {
  margin: 5px 0 10px;
  color: rgba(var(--v-theme-on-surface), 0.7);
  font-size: 0.82rem;
  line-height: 1.5;
}

.manual-state-card dl {
  display: grid;
  gap: 8px;
  margin: 0;
}

.manual-state-card dl > div {
  padding-top: 8px;
  border-top: 1px solid rgba(var(--v-theme-on-surface), 0.07);
}

.manual-state-card dt {
  color: rgba(var(--v-theme-on-surface), 0.86);
  font-size: 0.72rem;
  font-weight: 750;
}

.manual-state-card dd {
  margin: 3px 0 0;
  color: rgba(var(--v-theme-on-surface), 0.66);
  font-size: 0.78rem;
  line-height: 1.45;
}

.manual-handoff-section {
  border-color: rgba(var(--manual-warning), 0.17);
  background: linear-gradient(135deg, rgba(var(--manual-warning), 0.045), rgba(var(--v-theme-surface), 0.88) 58%);
}

.manual-handoff-card {
  padding: 15px;
  border: 1px solid rgba(var(--manual-warning), 0.16);
  border-radius: 15px;
  background: rgb(var(--v-theme-surface));
}

.manual-handoff-card__moment {
  color: rgb(var(--manual-warning));
  font-size: 0.69rem;
  font-weight: 800;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.manual-handoff-card__route {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
  color: rgba(var(--v-theme-on-surface), 0.9);
  font-size: 0.82rem;
  font-weight: 750;
}

.manual-handoff-card__route .v-icon {
  color: rgb(var(--manual-warning));
}

.manual-handoff-card__ready {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 10px;
  border-radius: 11px;
  color: rgba(var(--v-theme-on-surface), 0.72);
  background: rgba(var(--manual-success), 0.07);
  font-size: 0.78rem;
  line-height: 1.45;
}

.manual-handoff-card__ready .v-icon {
  flex: 0 0 auto;
  margin-top: 1px;
  color: rgb(var(--manual-success));
}

.manual-section-card {
  border-radius: 18px !important;
  box-shadow: 0 9px 28px rgba(15, 23, 42, 0.045);
}

.manual-list {
  margin: 0;
  padding-left: 18px;
  display: grid;
  gap: 8px;
  color: rgba(var(--v-theme-on-surface), 0.7);
  font-size: 0.79rem;
  line-height: 1.5;
}

.manual-errors-section {
  padding: 18px;
  border: 1px solid rgba(var(--manual-error), 0.13);
  border-radius: 20px;
  background: linear-gradient(135deg, rgba(var(--manual-error), 0.045), rgba(var(--v-theme-surface), 0.9) 46%);
}

.manual-errors-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 11px;
}

.manual-error-card {
  overflow: hidden;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  border-radius: 16px;
  background: rgb(var(--v-theme-surface));
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.045);
}

.manual-error-card__header {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 13px 14px;
  border-bottom: 1px solid rgba(var(--manual-error), 0.1);
  background: rgba(var(--manual-error), 0.055);
}

.manual-error-card__header > span {
  display: grid;
  flex: 0 0 auto;
  width: 25px;
  height: 25px;
  place-items: center;
  border-radius: 8px;
  color: rgb(var(--manual-error));
  background: rgba(var(--manual-error), 0.12);
  font-size: 0.68rem;
  font-weight: 850;
}

.manual-error-card__header strong {
  font-size: 0.82rem;
}

.manual-error-card__row {
  display: grid;
  grid-template-columns: 92px 1fr;
  gap: 9px;
  padding: 11px 14px 0;
  font-size: 0.75rem;
  line-height: 1.45;
}

.manual-error-card__row b {
  color: rgba(var(--v-theme-on-surface), 0.72);
}

.manual-error-card__row span {
  color: rgba(var(--v-theme-on-surface), 0.59);
}

.manual-error-card__solution {
  display: flex;
  align-items: flex-start;
  gap: 9px;
  margin: 12px 13px 13px;
  padding: 11px;
  border-radius: 12px;
  color: rgb(var(--manual-success));
  background: rgba(var(--manual-success), 0.075);
}

.manual-error-card__solution .v-icon {
  flex: 0 0 auto;
  margin-top: 1px;
}

.manual-error-card__solution b,
.manual-error-card__solution span {
  display: block;
}

.manual-error-card__solution b {
  font-size: 0.72rem;
}

.manual-error-card__solution span {
  margin-top: 3px;
  color: rgba(var(--v-theme-on-surface), 0.68);
  font-size: 0.74rem;
  line-height: 1.45;
}

.cursor-pointer {
  cursor: pointer;
}

@keyframes manual-pulse {
  70% { box-shadow: 0 0 0 8px rgba(var(--manual-primary), 0); }
  100% { box-shadow: 0 0 0 0 rgba(var(--manual-primary), 0); }
}

@media (max-width: 960px) {
  .manual-filter-panel {
    grid-template-columns: 1fr;
  }

  .manual-filter-panel__categories,
  .manual-hero__actions {
    justify-content: flex-start;
  }

  .manual-summary-grid {
    grid-template-columns: 1fr;
  }

  .manual-nav-card {
    position: static;
  }

  .manual-flow__step {
    grid-template-columns: 36px minmax(0, 1fr);
  }

  .manual-prerequisites__grid,
  .manual-errors-grid,
  .manual-state-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 599px) {
  .manual-hero,
  .manual-detail-card {
    padding: 20px 15px;
  }

  .manual-hero__actions,
  .manual-hero__actions .v-btn {
    width: 100%;
  }

  .manual-detail__header {
    flex-direction: column;
  }

  .manual-detail__header > div:last-child,
  .manual-detail__header .v-btn {
    width: 100%;
  }

  .manual-section-heading {
    align-items: flex-start;
    flex-wrap: wrap;
  }

  .manual-error-card__row {
    grid-template-columns: 1fr;
    gap: 3px;
  }

  .manual-field__example {
    grid-template-columns: 1fr;
    gap: 2px;
  }
}
</style>

<template>
  <v-row dense class="manual-layout">
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
              Aprende qué hacer, qué debe existir antes y cómo resolver los inconvenientes más comunes de cada proceso.
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
              Descargar PDF
            </v-btn>
            <v-btn
              color="success"
              variant="tonal"
              prepend-icon="mdi-file-excel"
              :loading="exportingExcel"
              :disabled="!accessibleManuals.length"
              @click="downloadManualExcel"
            >
              Descargar Excel
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
              <div><strong>Ruta recomendada</strong><span>Sigue el orden para evitar devolverte o perder información.</span></div>
            </div>
            <div class="manual-flow">
              <div
                v-for="(step, index) in activeManual.flow"
                :key="step.id"
                class="manual-flow__step"
              >
                <div class="manual-flow__step-index">{{ index + 1 }}</div>
                <div class="manual-flow__step-card">
                  <div class="manual-flow__step-kicker">PASO {{ index + 1 }}</div>
                  <div class="text-subtitle-1 font-weight-bold">{{ step.title }}</div>
                  <div class="text-body-2 text-medium-emphasis mt-2">
                    {{ step.description }}
                  </div>

                  <div v-if="step.fields.length" class="mt-3">
                    <div class="text-caption text-medium-emphasis mb-1">Lo que vas a usar</div>
                    <div class="d-flex flex-wrap" style="gap: 6px;">
                      <v-chip
                        v-for="field in step.fields"
                        :key="field"
                        size="small"
                        variant="tonal"
                        color="primary"
                        label
                      >
                        {{ field }}
                      </v-chip>
                    </div>
                  </div>

                  <ul v-if="step.checks.length" class="manual-list mt-3">
                    <li v-for="check in step.checks" :key="check">{{ check }}</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

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
        </v-card>
      </v-col>
    </template>
  </v-row>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
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
import { drawPdfCompanyLogo, getCompanyLogoAsset } from "@/app/utils/pdf-branding";
import {
  downloadReportExcel,
  type ReportDefinition,
} from "@/app/utils/maintenance-intelligence-reports";
import {
  buildUserManualExcelReport,
  buildUserManualPdfBlob,
  userManualFileName,
} from "@/app/utils/user-manual-documents";

const router = useRouter();
const auth = useAuthStore();
const menu = useMenuStore();
const ui = useUiStore();

const search = ref("");
const selectedCategory = ref("Todas");
const activeManualId = ref("");
const checklistState = ref<Record<string, boolean>>({});
const exportingPdf = ref(false);
const exportingExcel = ref(false);

function flattenMenu(nodes: MenuNode[]): MenuNode[] {
  return (nodes ?? []).flatMap((node) => [node, ...flattenMenu(node.children ?? [])]);
}

const manualStorageKey = computed(
  () => `user-manual:${auth.userId || auth.user?.id || auth.user?.nameUser || "anon"}`,
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
    const routeName = routeItem?.routeName ?? String(node.urlComponent || "").trim();
    const manual = getOperativeUserManualDefinition(routeName);
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
  const normalizedSearch = search.value.trim().toLowerCase();

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
      ...manual.flow.flatMap((item) => [item.title, item.description, ...item.fields, ...item.checks]),
      ...manual.fields.flatMap((field) => [field.label, field.type, field.note]),
    ]
      .join(" ")
      .toLowerCase();

    return haystack.includes(normalizedSearch);
  });
});

const activeManual = computed(
  () =>
    filteredManuals.value.find((manual) => manual.routeName === activeManualId.value) ??
    filteredManuals.value[0] ??
    null,
);

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

function manualFileSlug(value: string) {
  return String(value || "manual")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase() || "manual";
}

const manualPdfTextReplacements: Array<[string, string]> = [
  ["ÃƒÂ¡", "a"],
  ["ÃƒÂ©", "e"],
  ["ÃƒÂ­", "i"],
  ["ÃƒÂ³", "o"],
  ["ÃƒÂº", "u"],
  ["ÃƒÂ±", "n"],
  ["Ãƒâ€˜", "N"],
  ["Ã‚Â·", "-"],
  ["Ã‚", ""],
];

function pdfText(value: unknown) {
  let text = String(value ?? "");
  for (const [from, to] of manualPdfTextReplacements) {
    text = text.split(from).join(to);
  }
  return text.replace(/\s+/g, " ").trim();
}

function manualListText(items: string[], fallback = "No aplica") {
  const values = items.map(pdfText).filter(Boolean);
  return values.length ? values.join("\n") : fallback;
}

function manualGeneratedAtLabel() {
  return new Intl.DateTimeFormat("es-EC", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date());
}

function buildManualModuleGroups(manuals: UserManualDefinition[]) {
  const groups = new Map<string, UserManualDefinition[]>();
  for (const manual of manuals) {
    const category = manual.category || "General";
    groups.set(category, [...(groups.get(category) ?? []), manual]);
  }
  return [...groups.entries()].sort(([left], [right]) => left.localeCompare(right, "es"));
}

function buildManualExcelReportLegacy(manuals: UserManualDefinition[]): ReportDefinition {
  const userLabel = String(auth.user?.nameSurname || auth.user?.nameUser || "Usuario");
  const roleLabel = String(auth.user?.role?.nombre || "Sin rol asignado");

  return {
    fileName: `manual_usuario_${manualFileSlug(roleLabel)}_${new Date().toISOString().slice(0, 10)}`,
    title: "Manual de usuario KPI Justice",
    subtitle: `Guía paso a paso para ${userLabel}. Incluye únicamente los procesos disponibles para su perfil.`,
    generatedAt: new Date().toISOString(),
    summary: [
      { label: "Usuario", value: userLabel },
      { label: "Perfil", value: roleLabel },
      { label: "Procesos incluidos", value: manuals.length },
      { label: "Guías completadas", value: completedChecklistCount.value },
    ],
    sheets: [
      {
        name: "Ruta de trabajo",
        note: "Sigue los pasos en el orden indicado. La columna Verifica antes de avanzar ayuda a prevenir errores.",
        groupBy: ["modulo", "categoria"],
        rows: manuals.flatMap((manual) =>
          manual.flow.map((step, index) => ({
            modulo: manual.title,
            categoria: manual.category,
            paso: index + 1,
            accion: step.title,
            que_hacer: step.description,
            elementos_a_usar: step.fields.join(" | ") || "No aplica",
            verifica_antes_de_avanzar: step.checks.join(" | ") || "Continúa con el siguiente paso",
          })),
        ),
      },
      {
        name: "Antes de empezar",
        note: "Si falta alguno de estos puntos, completa primero el proceso de origen.",
        groupBy: ["modulo", "categoria"],
        rows: manuals.flatMap((manual) =>
          manual.prerequisites.map((item, index) => ({
            modulo: manual.title,
            categoria: manual.category,
            orden: index + 1,
            requisito_previo: item,
          })),
        ),
      },
      {
        name: "Datos a completar",
        note: "Los datos obligatorios deben completarse antes de guardar. Las indicaciones explican cómo utilizarlos.",
        groupBy: ["modulo", "categoria"],
        rows: manuals.flatMap((manual) =>
          sortedFields(manual).map((field) => ({
            modulo: manual.title,
            categoria: manual.category,
            dato: field.label,
            es_obligatorio: field.required ? "Sí" : "No",
            como_completarlo: field.note,
          })),
        ),
      },
      {
        name: "Solución de problemas",
        note: "Identifica qué ocurre, revisa el proceso anterior y aplica la solución recomendada.",
        groupBy: ["modulo", "categoria"],
        rows: manuals.flatMap((manual) =>
          manual.commonErrors.map((issue) => ({
            modulo: manual.title,
            categoria: manual.category,
            inconveniente: issue.title,
            que_ocurre: issue.whatHappens,
            por_que_ocurre: issue.why,
            como_resolverlo: issue.howToResolve,
          })),
        ),
      },
      {
        name: "Verificación final",
        note: "Utiliza esta lista para confirmar que el proceso quedó completo y listo para el siguiente paso.",
        groupBy: ["modulo", "categoria"],
        rows: manuals.flatMap((manual) =>
          manual.checklist.map((item, index) => ({
            modulo: manual.title,
            categoria: manual.category,
            estado: isChecklistChecked(manual, index) ? "Completado" : "Pendiente",
            verificacion: item,
          })),
        ),
      },
    ],
    orientation: "landscape",
  };
}

async function downloadManualExcelLegacy() {
  const manuals = accessibleManuals.value;
  if (!manuals.length) {
    ui.error("No hay módulos disponibles para generar el manual.");
    return;
  }

  exportingExcel.value = true;
  try {
    await downloadReportExcel(buildManualExcelReportLegacy(manuals));
    ui.success("Manual descargado en Excel.");
  } catch (error: any) {
    ui.error(error?.message || "No se pudo descargar el manual en Excel.");
  } finally {
    exportingExcel.value = false;
  }
}

function addManualPdfFooter(doc: any) {
  const totalPages = doc.getNumberOfPages();
  for (let page = 1; page <= totalPages; page += 1) {
    doc.setPage(page);
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    doc.setDrawColor(183, 201, 214);
    doc.line(48, pageHeight - 36, pageWidth - 48, pageHeight - 36);
    doc.setTextColor(91, 107, 123);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text("Manual de usuario KPI Justice", 48, pageHeight - 20);
    doc.text(`Pagina ${page} de ${totalPages}`, pageWidth - 48, pageHeight - 20, {
      align: "right",
    });
  }
}

async function downloadManualPdfLegacy() {
  const manuals = accessibleManuals.value;
  if (!manuals.length) {
    ui.error("No hay modulos disponibles para generar el manual.");
    return;
  }
  exportingPdf.value = true;
  try {
    const [{ jsPDF }, autoTableModule] = await Promise.all([
      import("jspdf"),
      import("jspdf-autotable"),
    ]);
    const autoTable = autoTableModule.default as any;
    const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
    const companyLogoAsset = await getCompanyLogoAsset();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const marginX = 48;
    const contentWidth = pageWidth - marginX * 2;
    const headerTop = 82;
    const bottomLimit = pageHeight - 58;
    const generatedAt = manualGeneratedAtLabel();
    const userLabel = pdfText(auth.user?.nameSurname || auth.user?.nameUser || "Usuario");
    const roleLabel = pdfText(auth.user?.role?.nombre || "Sin rol asignado");

    function drawHeader() {
      doc.setFillColor(31, 78, 120);
      doc.rect(0, 0, pageWidth, 56, "F");
      doc.setFillColor(244, 177, 131);
      doc.rect(0, 56, pageWidth, 4, "F");
      drawPdfCompanyLogo(doc, companyLogoAsset, {
        marginX,
        y: 12,
        maxWidth: 94,
        maxHeight: 28,
      });
      const headerTextX = marginX + (companyLogoAsset ? 110 : 0);
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text("KPI Justice", headerTextX, 32);
      doc.setFont("helvetica", "normal");
      doc.text("Guía de trabajo paso a paso", pageWidth - marginX, 32, { align: "right" });
      doc.setTextColor(31, 41, 55);
    }

    function ensureSpace(y: number, needed = 64) {
      if (y + needed <= bottomLimit) return y;
      doc.addPage();
      drawHeader();
      return headerTop;
    }

    function sectionTitle(title: string, y: number) {
      y = ensureSpace(y, 42);
      doc.setFillColor(236, 244, 251);
      doc.roundedRect(marginX, y - 15, contentWidth, 28, 6, 6, "F");
      doc.setTextColor(31, 78, 120);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11.5);
      doc.text(pdfText(title), marginX + 10, y + 3);
      doc.setTextColor(31, 41, 55);
      return y + 25;
    }

    function paragraph(text: unknown, y: number, fontSize = 9) {
      const clean = pdfText(text);
      if (!clean) return y;
      const lines = doc.splitTextToSize(clean, contentWidth);
      y = ensureSpace(y, lines.length * (fontSize + 4));
      doc.setFont("helvetica", "normal");
      doc.setFontSize(fontSize);
      doc.setTextColor(31, 41, 55);
      doc.text(lines, marginX, y);
      return y + lines.length * (fontSize + 4) + 8;
    }

    function table(startY: number, head: string[], body: Array<Array<string | number>>) {
      autoTable(doc, {
        startY,
        head: [head.map(pdfText)],
        body: body.map((row) => row.map((cell) => pdfText(cell))),
        theme: "grid",
        margin: { left: marginX, right: marginX, top: headerTop, bottom: 58 },
        styles: {
          font: "helvetica",
          fontSize: 7.6,
          cellPadding: 5.5,
          lineColor: [183, 201, 214],
          lineWidth: 0.25,
          valign: "top",
          overflow: "linebreak",
        },
        headStyles: {
          fillColor: [31, 78, 120],
          textColor: [255, 255, 255],
          fontStyle: "bold",
        },
        alternateRowStyles: { fillColor: [247, 250, 252] },
        didDrawPage: drawHeader,
      });
      return ((doc as any).lastAutoTable?.finalY ?? startY) + 18;
    }

    doc.setFillColor(31, 78, 120);
    doc.rect(0, 0, pageWidth, 174, "F");
    doc.setFillColor(244, 177, 131);
    doc.rect(0, 174, pageWidth, 6, "F");
    drawPdfCompanyLogo(doc, companyLogoAsset, {
      marginX,
      y: 24,
      maxWidth: 150,
      maxHeight: 46,
    });
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(24);
    doc.text("Guía de Usuario", marginX, 96);
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text("Procesos explicados paso a paso, con requisitos y soluciones", marginX, 122);
    doc.text("KPI Justice", marginX, 146);

    doc.setTextColor(31, 41, 55);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("Tu guía personalizada", marginX, 212);
    autoTable(doc, {
      startY: 230,
      body: [
        ["Usuario", userLabel],
        ["Perfil de trabajo", roleLabel],
        ["Generado", generatedAt],
        ["Procesos incluidos", manuals.length],
        ["Contenido", "Se muestran únicamente los procesos disponibles para este usuario."],
      ],
      theme: "grid",
      margin: { left: marginX, right: marginX },
      styles: { font: "helvetica", fontSize: 9, cellPadding: 7, lineColor: [183, 201, 214] },
      columnStyles: {
        0: { fillColor: [217, 234, 247], fontStyle: "bold", cellWidth: 150 },
        1: { cellWidth: contentWidth - 150 },
      },
    });
    let y = ((doc as any).lastAutoTable?.finalY ?? 304) + 28;
    y = sectionTitle("Cómo utilizar esta guía", y);
    y = paragraph(
      "Busca el proceso que deseas realizar, confirma primero los requisitos, sigue los pasos en orden y utiliza la sección de solución de problemas cuando el sistema no te permita continuar. Finaliza marcando la lista de verificación.",
      y,
      10,
    );

    doc.addPage();
    drawHeader();
    y = sectionTitle("Índice general", headerTop);
    y = paragraph(
      "Los procesos están agrupados por área de trabajo. Cada capítulo explica para qué sirve, qué debe existir antes, qué información completar, errores frecuentes y cómo confirmar que todo quedó listo.",
      y,
    );
    for (const [category, items] of buildManualModuleGroups(manuals)) {
      y = sectionTitle(category, y + 6);
      for (const manual of items) {
        y = ensureSpace(y, 18);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(31, 41, 55);
        doc.text(`- ${pdfText(manual.title)}`, marginX + 10, y);
        y += 16;
      }
    }

    manuals.forEach((manual, manualIndex) => {
      doc.addPage();
      drawHeader();
      let moduleY = sectionTitle(`${manualIndex + 1}. ${manual.title}`, headerTop);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(91, 107, 123);
      doc.text(`Categoria: ${pdfText(manual.category)}`, marginX, moduleY);
      moduleY += 18;
      moduleY = paragraph(manual.summary, moduleY, 9);

      moduleY = sectionTitle("¿Para qué sirve?", moduleY + 4);
      moduleY = paragraph(manual.purpose, moduleY, 9);

      moduleY = sectionTitle("Antes de empezar", moduleY + 4);
      moduleY = paragraph(manualListText(manual.prerequisites), moduleY, 9);

      moduleY = sectionTitle("Ruta recomendada", moduleY + 4);
      moduleY = table(
        moduleY,
        ["No.", "Paso", "Qué hacer", "Lo que vas a usar", "Verifica antes de avanzar"],
        manual.flow.map((step, index) => [
          index + 1,
          step.title,
          step.description,
          manualListText(step.fields, "No aplica"),
          manualListText(step.checks, "No aplica"),
        ]),
      );

      moduleY = sectionTitle("Información que debes completar", moduleY + 4);
      moduleY = table(
        moduleY,
        ["Dato", "Obligatorio", "Cómo completarlo"],
        sortedFields(manual).map((field) => [
          field.label,
          field.required ? "Si" : "No",
          field.note,
        ]),
      );

      moduleY = sectionTitle("Recomendaciones y cuidados", moduleY + 4);
      moduleY = table(
        moduleY,
        ["Tipo", "Detalle"],
        [
          ...manual.tips.map((item) => ["Recomendación", item]),
          ...manual.warnings.map((item) => ["Cuidado", item]),
        ],
      );

      moduleY = sectionTitle("Si el proceso no te deja continuar", moduleY + 4);
      moduleY = table(
        moduleY,
        ["Inconveniente", "Qué ocurre", "Por qué ocurre", "Cómo resolverlo"],
        manual.commonErrors.map((issue) => [
          issue.title,
          issue.whatHappens,
          issue.why,
          issue.howToResolve,
        ]),
      );

      moduleY = sectionTitle("Verificación final", moduleY + 4);
      table(
        moduleY,
        ["Estado", "Verificacion"],
        manual.checklist.map((item, index) => [
          isChecklistChecked(manual, index) ? "Completado" : "Pendiente",
          item,
        ]),
      );
    });

    addManualPdfFooter(doc);
    doc.save(`manual_usuario_${manualFileSlug(roleLabel)}_${new Date().toISOString().slice(0, 10)}.pdf`);
    ui.success("Manual completo descargado en PDF.");
  } catch (error: any) {
    ui.error(error?.message || "No se pudo descargar el manual en PDF.");
  } finally {
    exportingPdf.value = false;
  }
}

// Conserva los generadores anteriores como respaldo mientras las descargas activas
// utilizan el formato unificado y validado en user-manual-documents.
void downloadManualExcelLegacy;
void downloadManualPdfLegacy;

function manualDocumentContext() {
  return {
    manuals: accessibleManuals.value,
    userLabel: String(auth.user?.nameSurname || auth.user?.nameUser || "Usuario"),
    roleLabel: String(auth.user?.role?.nombre || "Sin rol asignado"),
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
    await downloadReportExcel(buildUserManualExcelReport(context));
    ui.success("Manual descargado en Excel.");
  } catch (error: any) {
    ui.error(error?.message || "No se pudo descargar el manual en Excel.");
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
    const blob = await buildUserManualPdfBlob(context);
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${userManualFileName(context.roleLabel, context.generatedAt)}.pdf`;
    anchor.click();
    URL.revokeObjectURL(url);
    ui.success("Manual completo descargado en PDF.");
  } catch (error: any) {
    ui.error(error?.message || "No se pudo descargar el manual en PDF.");
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
</script>

<style scoped>
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
  transform: translateY(-2px);
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
  .manual-errors-grid {
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
}
</style>

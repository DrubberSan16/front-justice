<template>
  <v-row dense class="manual-layout">
    <v-col cols="12">
      <v-card rounded="xl" class="pa-4 enterprise-surface manual-hero">
        <div class="manual-hero__content">
          <div>
            <div class="text-overline manual-hero__eyebrow">Manual operativo</div>
            <div class="text-h5 font-weight-bold">Manual de usuario dinamico</div>
            <div class="text-body-1 text-medium-emphasis mt-2">
              El contenido se arma segun los modulos que el usuario tiene permiso de lectura.
            </div>
          </div>

          <div class="manual-hero__stats">
            <v-chip color="primary" variant="tonal" label>
              {{ filteredManuals.length }} modulos visibles
            </v-chip>
            <v-chip color="secondary" variant="tonal" label>
              {{ categoryOptions.length - 1 }} categorias
            </v-chip>
            <v-chip color="success" variant="tonal" label>
              {{ completedChecklistCount }} checklist completados
            </v-chip>
          </div>
        </div>

        <v-row dense class="mt-3">
          <v-col cols="12" md="6">
            <v-text-field
              v-model="search"
              label="Buscar modulo, campo o flujo"
              variant="outlined"
              density="comfortable"
              prepend-inner-icon="mdi-magnify"
              clearable
            />
          </v-col>
          <v-col cols="12" md="6" class="d-flex align-center justify-end flex-wrap" style="gap: 8px;">
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
          </v-col>
        </v-row>
      </v-card>
    </v-col>

    <v-col v-if="!filteredManuals.length" cols="12">
      <v-alert type="warning" variant="tonal">
        No hay modulos operativos visibles para este usuario o el filtro actual no encontro coincidencias.
      </v-alert>
    </v-col>

    <template v-else>
      <v-col cols="12" md="4" lg="3">
        <v-card rounded="xl" class="pa-2 enterprise-surface manual-nav-card">
          <div class="px-3 pt-2 pb-1 text-subtitle-2 font-weight-bold">
            Modulos disponibles
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
                {{ manual.category }} · {{ manual.flow.length }} pasos
              </v-list-item-subtitle>
              <template #append>
                <v-chip size="small" variant="tonal" color="primary">
                  {{ checklistProgress(manual) }}/{{ manual.checklist.length }}
                </v-chip>
              </template>
            </v-list-item>
          </v-list>
        </v-card>
      </v-col>

      <v-col cols="12" md="8" lg="9">
        <v-card v-if="activeManual" rounded="xl" class="pa-4 enterprise-surface">
          <div class="manual-detail__header">
            <div>
              <div class="d-flex align-center flex-wrap" style="gap: 10px;">
                <div class="text-h6 font-weight-bold">{{ activeManual.title }}</div>
                <v-chip color="primary" variant="tonal" label>
                  {{ activeManual.category }}
                </v-chip>
              </div>
              <div class="text-body-1 text-medium-emphasis mt-2">
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

          <v-alert type="info" variant="tonal" class="mt-4">
            {{ activeManual.purpose }}
          </v-alert>

          <div class="mt-4">
            <div class="text-subtitle-1 font-weight-bold mb-2">Requisitos previos</div>
            <div class="d-flex flex-wrap" style="gap: 8px;">
              <v-chip
                v-for="item in activeManual.prerequisites"
                :key="item"
                variant="tonal"
                color="secondary"
                label
              >
                {{ item }}
              </v-chip>
            </div>
          </div>

          <div class="mt-5">
            <div class="text-subtitle-1 font-weight-bold mb-3">Flujo recomendado</div>
            <div class="manual-flow">
              <div
                v-for="(step, index) in activeManual.flow"
                :key="step.id"
                class="manual-flow__step"
              >
                <div class="manual-flow__step-index">{{ index + 1 }}</div>
                <div class="manual-flow__step-card">
                  <div class="text-subtitle-2 font-weight-bold">{{ step.title }}</div>
                  <div class="text-body-2 text-medium-emphasis mt-2">
                    {{ step.description }}
                  </div>

                  <div v-if="step.fields.length" class="mt-3">
                    <div class="text-caption text-medium-emphasis mb-1">Campos o acciones clave</div>
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
                <div class="text-subtitle-1 font-weight-bold mb-3">Campos a cargar</div>
                <div class="manual-fields">
                  <div
                    v-for="field in sortedFields(activeManual)"
                    :key="`${activeManual.routeName}-${field.key}`"
                    class="manual-field"
                  >
                    <div class="d-flex align-center justify-space-between" style="gap: 8px;">
                      <div class="font-weight-medium">{{ field.label }}</div>
                      <div class="d-flex flex-wrap justify-end" style="gap: 6px;">
                        <v-chip size="x-small" variant="tonal" color="info" label>
                          {{ field.type }}
                        </v-chip>
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
                <div class="text-subtitle-1 font-weight-bold mb-3">Buenas practicas</div>
                <ul class="manual-list">
                  <li v-for="tip in activeManual.tips" :key="tip">{{ tip }}</li>
                </ul>
              </v-card>

              <v-card rounded="xl" class="pa-4 manual-section-card">
                <div class="text-subtitle-1 font-weight-bold mb-3">Alertas al usuario</div>
                <ul class="manual-list">
                  <li v-for="warning in activeManual.warnings" :key="warning">{{ warning }}</li>
                </ul>
              </v-card>
            </v-col>
          </v-row>

          <v-row dense class="mt-2">
            <v-col cols="12" lg="7">
              <v-card rounded="xl" class="pa-4 manual-section-card">
                <div class="d-flex align-center justify-space-between flex-wrap" style="gap: 8px;">
                  <div class="text-subtitle-1 font-weight-bold">Checklist interactivo</div>
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
                <div class="text-subtitle-1 font-weight-bold mb-3">Modulos relacionados</div>
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
                  Este modulo no tiene relaciones directas visibles para el usuario actual.
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
import {
  getOperativeUserManualDefinition,
  type UserManualDefinition,
  type UserManualFieldGuide,
} from "@/app/config/user-manual";
import type { MenuNode } from "@/app/types/menu.types";
import { findMenuRouteByValue } from "@/app/utils/menu-route-catalog";

const router = useRouter();
const auth = useAuthStore();
const menu = useMenuStore();

const search = ref("");
const selectedCategory = ref("Todas");
const activeManualId = ref("");
const checklistState = ref<Record<string, boolean>>({});

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
  align-items: flex-start;
}

.manual-hero {
  border: 1px solid var(--surface-border);
  background:
    radial-gradient(circle at top right, rgba(var(--v-theme-primary), 0.1), transparent 32%),
    linear-gradient(180deg, rgba(var(--v-theme-surface), 0.98), rgba(var(--v-theme-surface), 0.92));
}

.manual-hero__content {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}

.manual-hero__eyebrow {
  color: var(--app-muted-text);
  letter-spacing: 0.12em;
}

.manual-hero__stats {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: flex-end;
}

.manual-nav-card {
  position: sticky;
  top: 88px;
}

.manual-nav-avatar {
  border: 1px solid var(--surface-border);
  background: rgba(var(--v-theme-primary), 0.08);
  font-weight: 700;
}

.manual-detail__header {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
  align-items: flex-start;
}

.manual-flow {
  display: grid;
  gap: 14px;
}

.manual-flow__step {
  display: grid;
  grid-template-columns: 44px minmax(0, 1fr);
  gap: 12px;
  align-items: stretch;
}

.manual-flow__step-index {
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 14px;
  border-radius: 18px;
  background: rgba(var(--v-theme-primary), 0.1);
  color: rgb(var(--v-theme-primary));
  font-weight: 700;
}

.manual-flow__step-card,
.manual-section-card,
.manual-field {
  border: 1px solid var(--surface-border);
  background: rgba(var(--v-theme-surface), 0.82);
  border-radius: 20px;
}

.manual-flow__step-card {
  padding: 16px;
}

.manual-fields {
  display: grid;
  gap: 12px;
}

.manual-field {
  padding: 14px;
}

.manual-list {
  margin: 0;
  padding-left: 18px;
  display: grid;
  gap: 8px;
}

.cursor-pointer {
  cursor: pointer;
}

@media (max-width: 960px) {
  .manual-nav-card {
    position: static;
  }

  .manual-flow__step {
    grid-template-columns: 36px minmax(0, 1fr);
  }
}
</style>

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
            <v-btn
              color="primary"
              variant="tonal"
              prepend-icon="mdi-file-pdf-box"
              :loading="exportingPdf"
              :disabled="!accessibleManuals.length"
              @click="downloadManualPdf"
            >
              Descargar manual PDF
            </v-btn>
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

          <div class="mt-4 text-body-2 text-medium-emphasis">
            {{ activeManual.purpose }}
          </div>

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
import { useUiStore } from "@/app/stores/ui.store";
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
const ui = useUiStore();

const search = ref("");
const selectedCategory = ref("Todas");
const activeManualId = ref("");
const checklistState = ref<Record<string, boolean>>({});
const exportingPdf = ref(false);

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

async function downloadManualPdf() {
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
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const marginX = 48;
    const contentWidth = pageWidth - marginX * 2;
    const headerTop = 70;
    const bottomLimit = pageHeight - 58;
    const generatedAt = manualGeneratedAtLabel();
    const userLabel = pdfText(auth.user?.nameSurname || auth.user?.nameUser || "Usuario");
    const roleLabel = pdfText(auth.user?.role?.nombre || "Sin rol asignado");

    function drawHeader() {
      doc.setFillColor(31, 78, 120);
      doc.rect(0, 0, pageWidth, 34, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text("KPI Justice", marginX, 22);
      doc.setFont("helvetica", "normal");
      doc.text("Manual de usuario", pageWidth - marginX, 22, { align: "right" });
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
      doc.setTextColor(31, 78, 120);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.text(pdfText(title), marginX, y);
      doc.setDrawColor(31, 78, 120);
      doc.line(marginX, y + 6, pageWidth - marginX, y + 6);
      doc.setTextColor(31, 41, 55);
      return y + 24;
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
          fontSize: 7.8,
          cellPadding: 5,
          lineColor: [183, 201, 214],
          lineWidth: 0.4,
          valign: "top",
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
    doc.rect(0, 0, pageWidth, 136, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(24);
    doc.text("Manual de Usuario", marginX, 64);
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text("Guia operativa consolidada por permisos de acceso", marginX, 88);
    doc.text("KPI Justice", marginX, 112);

    doc.setTextColor(31, 41, 55);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("Informacion del documento", marginX, 182);
    autoTable(doc, {
      startY: 202,
      body: [
        ["Usuario", userLabel],
        ["Rol", roleLabel],
        ["Generado", generatedAt],
        ["Modulos incluidos", manuals.length],
        ["Alcance", "Solo se incluyen modulos con permiso de lectura para el usuario actual."],
      ],
      theme: "grid",
      margin: { left: marginX, right: marginX },
      styles: { font: "helvetica", fontSize: 9, cellPadding: 7, lineColor: [183, 201, 214] },
      columnStyles: {
        0: { fillColor: [217, 234, 247], fontStyle: "bold", cellWidth: 150 },
        1: { cellWidth: contentWidth - 150 },
      },
    });
    let y = ((doc as any).lastAutoTable?.finalY ?? 290) + 28;
    y = sectionTitle("Proposito", y);
    y = paragraph(
      "Este manual consolida los flujos de uso, campos principales, controles esperados y recomendaciones operativas de los modulos disponibles para el usuario. Debe utilizarse como guia de consulta para ejecutar procesos con trazabilidad y consistencia.",
      y,
      10,
    );

    doc.addPage();
    drawHeader();
    y = sectionTitle("Indice general", headerTop);
    y = paragraph(
      "Los modulos se agrupan por categoria funcional. Cada capitulo contiene objetivo, requisitos previos, flujo operativo, campos a cargar, buenas practicas, alertas y checklist.",
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

      moduleY = sectionTitle("Objetivo y alcance", moduleY + 4);
      moduleY = paragraph(manual.purpose, moduleY, 9);

      moduleY = sectionTitle("Requisitos previos", moduleY + 4);
      moduleY = paragraph(manualListText(manual.prerequisites), moduleY, 9);

      moduleY = sectionTitle("Flujo operativo", moduleY + 4);
      moduleY = table(
        moduleY,
        ["No.", "Paso", "Descripcion", "Campos o acciones", "Controles"],
        manual.flow.map((step, index) => [
          index + 1,
          step.title,
          step.description,
          manualListText(step.fields, "No aplica"),
          manualListText(step.checks, "No aplica"),
        ]),
      );

      moduleY = sectionTitle("Campos a cargar", moduleY + 4);
      moduleY = table(
        moduleY,
        ["Campo", "Tipo", "Requerido", "Observacion"],
        sortedFields(manual).map((field) => [
          field.label,
          field.type,
          field.required ? "Si" : "No",
          field.note,
        ]),
      );

      moduleY = sectionTitle("Buenas practicas y alertas", moduleY + 4);
      moduleY = table(
        moduleY,
        ["Tipo", "Detalle"],
        [
          ...manual.tips.map((item) => ["Buena practica", item]),
          ...manual.warnings.map((item) => ["Alerta", item]),
        ],
      );

      moduleY = sectionTitle("Checklist operativo", moduleY + 4);
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

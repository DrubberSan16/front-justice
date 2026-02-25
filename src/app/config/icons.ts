/**
 * Backend envía icon strings tipo "$mdiDashboard".
 * Esta utilidad los transforma a formatos válidos para Vuetify <v-icon :icon="..."/>.
 */
export const iconMap: Record<string, string> = {
  $mdiDashboard: "mdi-view-dashboard",
  mdiDashboard: "mdi-view-dashboard",
  "mdi-view-dashboard": "mdi-view-dashboard",

  $mdiAdmin: "mdi-shield-account",
  mdiAdmin: "mdi-shield-account",
  "mdi-shield-account": "mdi-shield-account",

  $mdiUser: "mdi-account",
  mdiUser: "mdi-account",
  "mdi-account": "mdi-account",

  $mdiList: "mdi-format-list-bulleted",
  mdiList: "mdi-format-list-bulleted",
  "mdi-format-list-bulleted": "mdi-format-list-bulleted",

  $mdiCheck: "mdi-check-decagram",
  mdiCheck: "mdi-check-decagram",
  "mdi-check-decagram": "mdi-check-decagram",

  $mdiAlert: "mdi-alert",
  mdiAlert: "mdi-alert",
  "mdi-alert": "mdi-alert",

  $mdiPerson: "mdi-account-wrench",
  mdiPerson: "mdi-account-wrench",
  "mdi-account-wrench": "mdi-account-wrench",

  $mdiCircleSmall: "mdi-circle-small",
  mdiCircleSmall: "mdi-circle-small",
  "mdi-circle-small": "mdi-circle-small",
};

const ICON_FALLBACK = "mdi-help-circle-outline";

const normalizeBackendIcon = (backendIcon?: string): string | null => {
  if (!backendIcon) return null;

  const normalized = backendIcon.trim();
  return normalized.length ? normalized : null;
};

const toKebab = (value: string) =>
  value
    .replace(/^[A-Z]/, (m) => m.toLowerCase())
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .toLowerCase();

export const resolveIcon = (backendIcon?: string) => {
  const normalized = normalizeBackendIcon(backendIcon);
  if (!normalized) return ICON_FALLBACK;

  // Caso 1: mapeo explícito de tokens usados por backend.
  if (iconMap[normalized]) return iconMap[normalized];

  // Caso 2: el backend ya devuelve un path SVG de @mdi/js.
  if (normalized.startsWith("M")) return `svg:${normalized}`;

  // Caso 3: el backend devuelve nombres de fuente listos para Vuetify.
  if (normalized.startsWith("mdi-")) return normalized;

  // Caso 4: tokens tipo "$mdiSomething" o "mdiSomething".
  if (normalized.startsWith("$mdi") || normalized.startsWith("mdi")) {
    const raw = normalized.startsWith("$") ? normalized.slice(4) : normalized.slice(3);
    const kebab = toKebab(raw);
    return kebab ? `mdi-${kebab}` : ICON_FALLBACK;
  }

  return ICON_FALLBACK;
};

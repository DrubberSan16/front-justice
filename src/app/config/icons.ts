import {
  mdiViewDashboard,
  mdiShieldAccount,
  mdiAccount,
  mdiFormatListBulleted,
  mdiCheckDecagram,
  mdiAlert,
  mdiAccountWrench,
  mdiCircleSmall,
  mdiHelpCircleOutline,
} from "@mdi/js";

/**
 * Backend envía icon strings tipo "$mdiDashboard".
 * Aquí los mapeamos a paths de @mdi/js para Vuetify <v-icon :icon="..."/>
 */
export const iconMap: Record<string, string> = {
  $mdiDashboard: mdiViewDashboard,
  mdiDashboard: mdiViewDashboard,
  "mdi-view-dashboard": mdiViewDashboard,
  $mdiAdmin: mdiShieldAccount,
  mdiAdmin: mdiShieldAccount,
  "mdi-shield-account": mdiShieldAccount,
  $mdiUser: mdiAccount,
  mdiUser: mdiAccount,
  "mdi-account": mdiAccount,
  $mdiList: mdiFormatListBulleted,
  mdiList: mdiFormatListBulleted,
  "mdi-format-list-bulleted": mdiFormatListBulleted,
  $mdiCheck: mdiCheckDecagram,
  mdiCheck: mdiCheckDecagram,
  "mdi-check-decagram": mdiCheckDecagram,
  $mdiAlert: mdiAlert,
  mdiAlert: mdiAlert,
  "mdi-alert": mdiAlert,
  $mdiPerson: mdiAccountWrench,
  mdiPerson: mdiAccountWrench,
  "mdi-account-wrench": mdiAccountWrench,
  $mdiCircleSmall: mdiCircleSmall,
  mdiCircleSmall: mdiCircleSmall,
  "mdi-circle-small": mdiCircleSmall,
};

const normalizeBackendIcon = (backendIcon?: string): string | null => {
  if (!backendIcon) return null;

  const normalized = backendIcon.trim();
  return normalized.length ? normalized : null;
};

export const resolveIcon = (backendIcon?: string) => {
  const normalized = normalizeBackendIcon(backendIcon);
  if (!normalized) return mdiHelpCircleOutline;

  // Caso 1: mapeo explícito de tokens usados por backend.
  if (iconMap[normalized]) return iconMap[normalized];

  // Caso 2: el backend ya devuelve un path SVG de @mdi/js.
  if (normalized.startsWith("M")) return normalized;

  // Caso 3: íconos por nombre de fuente (mdi-*) configurados en Vuetify.
  if (normalized.startsWith("mdi-")) return normalized;

  return mdiHelpCircleOutline;
};

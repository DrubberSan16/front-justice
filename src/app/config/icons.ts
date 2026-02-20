import {
  mdiViewDashboard,
  mdiShieldAccount,
  mdiAccount,
  mdiFormatListBulleted,
  mdiCheckDecagram,
  mdiAlert,
  mdiAccountWrench,
  mdiCircleSmall,
} from "@mdi/js";

/**
 * Backend envía icon strings tipo "$mdiDashboard".
 * Aquí los mapeamos a paths de @mdi/js para Vuetify <v-icon :icon="..."/>
 */
export const iconMap: Record<string, string> = {
  $mdiDashboard: mdiViewDashboard,
  $mdiAdmin: mdiShieldAccount,
  $mdiUser: mdiAccount,
  $mdiList: mdiFormatListBulleted,
  $mdiCheck: mdiCheckDecagram,
  $mdiAlert: mdiAlert,
  $mdiPerson: mdiAccountWrench,
};

export const resolveIcon = (backendIcon?: string) =>
  (backendIcon && iconMap[backendIcon]) ? iconMap[backendIcon] : mdiCircleSmall;

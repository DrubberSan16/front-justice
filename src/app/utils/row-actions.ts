/**
 * Una accion dentro del menu de acciones de una fila.
 *
 * La lista que recibe el menu ya viene filtrada por permiso: lo que el usuario
 * no puede hacer no se pasa, no se pinta deshabilitado. `disabled` queda para
 * lo que si puede hacer pero no en ESE registro (una orden anulada, un
 * documento sin adjuntos), y ahi el motivo va en `hint` para que la fila
 * explique por que no responde.
 */
export type RowAction = {
  /** Identificador que vuelve en el evento `select`. */
  key: string;
  label: string;
  icon?: string;
  /** Color de Vuetify; `error` para lo destructivo. */
  color?: string;
  disabled?: boolean;
  /** Se descarta del menu por completo (sin permiso, no aplica al registro). */
  hidden?: boolean;
  hint?: string;
  /** Dibuja un separador antes de esta accion. */
  divider?: boolean;
};

/** Deja solo lo que el usuario puede ver, respetando el orden declarado. */
export function visibleRowActions(actions: RowAction[]): RowAction[] {
  return (actions || []).filter((action) => action && action.hidden !== true);
}

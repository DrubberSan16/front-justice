export type MenuPermissions = {
  isReaded: boolean;
  isCreated: boolean;
  isEdited: boolean;
  permitDeleted: boolean;
  isReports: boolean;
  reportsPermit: string; // "{}"
};

export type MenuNode = {
  id: string;
  parentId: string | null;
  nombre: string;
  descripcion: string;
  icon: string;          // "$mdiDashboard", etc
  urlComponent: string;  // "Dashboard" | "Usuarios" | "/"
  menuPosition: string;  // "0", "1"...
  status: string;
  permissions: MenuPermissions;
  children: MenuNode[];
};

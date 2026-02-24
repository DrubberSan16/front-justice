export type MenuNodeFull = {
  id: string;
  parentId: string | null;
  nombre: string;
  descripcion: string | null;
  icon?: string | null;
  urlComponent: string;
  menuPosition: string | number;
  status: "ACTIVE" | "INACTIVE" | string;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string | null;
  updatedBy?: string | null;
  isDeleted: boolean;
  deletedAt?: string | null;
  deletedBy?: string | null;
  children: MenuNodeFull[];
};
export type MenuUser = {
  id: string;
  userId: string;
  menuId: string;

  status: "ACTIVE" | "INACTIVE" | string;

  createdAt?: string;
  updatedAt?: string;
  createdBy?: string | null;
  updatedBy?: string | null;

  isDelete?: boolean;
  deletedAt?: string | null;
  deletedBy?: string | null;

  isReaded: boolean;
  isCreated: boolean;
  isEdited: boolean;
  permitDeleted: boolean;
  isReports: boolean;
  reportsPermit: string; // "{}"
};

export type SaveMenuUserBody = {
  userId: string;
  menuId: string;
  status: "ACTIVE" | "INACTIVE" | string;
  createdBy: string;

  isReaded: boolean;
  isCreated: boolean;
  isEdited: boolean;
  permitDeleted: boolean;
  isReports: boolean;
  reportsPermit: string;
};
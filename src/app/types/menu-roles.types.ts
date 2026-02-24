import type { MenuNodeFull } from "@/app/types/menus-full.types";

export type MenuRole = {
  id: string;
  roleId: string;
  menuId: string;
  menu?: MenuNodeFull | null;

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

export type SaveMenuRoleBody = {
  roleId: string;
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
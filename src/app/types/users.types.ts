import type { Role } from "@/app/types/roles.types";

export type User = {
  id: string;
  nameUser: string;
  tokenActive: string | null;
  nameSurname: string;
  dateBirthday: string | null; // "YYYY-MM-DD"
  roleId: string;
  role?: Role | null;
  email: string;
  status: "ACTIVE" | "INACTIVE" | string;
  reportes?: string[];

  createdAt?: string;
  updatedAt?: string;
  createdBy?: string | null;
  updatedBy?: string | null;

  isDeleted: boolean;
  deletedAt?: string | null;
  deletedBy?: string | null;
};

export type CreateUserRequest = {
  nameUser: string;
  passUser: string;
  nameSurname: string;
  roleId: string;
  email: string;
  status: "ACTIVE" | "INACTIVE" | string;
  dateBirthday: string; // "YYYY-MM-DD"
  createdBy: string;
  reportes?: string[];
};

export type UpdateUserRequest = Partial<CreateUserRequest>;

export type LoginRequest = {
  nameUser: string;
  passUser: string;
};

export type LoginResponse = {
  accessToken: string;
  tokenType: string;
  expiresIn: string;
  user: {
    id: string;
    nameUser: string;
    nameSurname: string;
    email: string;
    roleId: string;
    reportes?: string[];
    effectiveReportes?: string[];
    sucursales?: string[];
    effectiveSucursales?: Array<{
      id: string;
      codigo: string;
      nombre: string;
    }>;
    allSucursales?: boolean;
    role: { id: string; nombre: string; reportes?: string[] };
  };
};

export type JwtPayload = {
  sub?: string;
  nameUser?: string;
  roleId?: string;
  iat?: number;
  exp?: number;
};
